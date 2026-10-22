import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags, PartialType } from '@nestjs/swagger';
import { Roles } from '../common/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';

type Model = 'location' | 'locationLink' | 'item' | 'npc' | 'shopEntry' | 'quest';

/**
 * Builds an admin-only REST controller with list / get / create / update / delete for a Prisma
 * model. Request bodies are validated against the supplied DTO class (update = partial DTO).
 */
export function createCrudController(path: string, model: Model, Dto: Type<object>): Type<unknown> {
  class UpdateDto extends PartialType(Dto) {}
  const pipe = (dto: Type<object>) =>
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      expectedType: dto,
    });

  @ApiTags('admin')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @Controller(`admin/${path}`)
  class CrudController {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    private get db() {
      return this.prisma[model] as any;
    }

    @Get()
    list() {
      return this.db.findMany({ orderBy: { id: 'asc' } });
    }

    @Get(':id')
    async get(@Param('id', ParseIntPipe) id: number) {
      const row = await this.db.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Record not found');
      return row;
    }

    @Post()
    @ApiBody({ type: Dto })
    create(@Body(pipe(Dto)) body: any) {
      return this.db.create({ data: body });
    }

    @Patch(':id')
    @ApiBody({ type: UpdateDto })
    update(@Param('id', ParseIntPipe) id: number, @Body(pipe(UpdateDto)) body: any) {
      return this.db.update({ where: { id }, data: body });
    }

    @Delete(':id')
    @HttpCode(204)
    async remove(@Param('id', ParseIntPipe) id: number) {
      await this.db.delete({ where: { id } });
    }
  }
  return CrudController;
}
