import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { STARTER_ITEMS } from '../game/constants';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private token(user: { id: number; username: string; role: string }) {
    return {
      accessToken: this.jwt.sign({ sub: user.id, username: user.username, role: user.role }),
      role: user.role,
    };
  }

  async register(dto: RegisterDto) {
    const characterName = dto.characterName ?? dto.username;
    const [byUser, byName] = await Promise.all([
      this.prisma.user.findUnique({ where: { username: dto.username } }),
      this.prisma.player.findUnique({ where: { name: characterName } }),
    ]);
    if (byUser) throw new ConflictException('Username is already taken');
    if (byName) throw new ConflictException('Character name is already taken');

    const start = await this.prisma.location.findFirst({ orderBy: { id: 'asc' } });
    if (!start) throw new InternalServerErrorException('World is empty: run the seed first');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: dto.username,
          passwordHash,
          player: { create: { name: characterName, locationId: start.id } },
        },
        include: { player: true },
      });
      for (const starter of STARTER_ITEMS) {
        const item = await tx.item.findUnique({ where: { name: starter.name } });
        if (!item) continue;
        await tx.inventoryItem.create({
          data: {
            playerId: created.player!.id,
            itemId: item.id,
            quantity: starter.quantity,
            equipped: starter.equip,
          },
        });
      }
      await tx.actionLog.create({
        data: {
          playerId: created.player!.id,
          message: `Добро пожаловать в Souls War, ${characterName}! Ваше приключение начинается в локации «${start.name}».`,
        },
      });
      return created;
    });
    return this.token(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !ok) throw new UnauthorizedException('Invalid username or password');
    return this.token(user);
  }
}
