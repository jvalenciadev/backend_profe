import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CreateInscripcionUseCase } from '../../application/use-cases/create-inscripcion.use-case';
import { GetInscripcionsUseCase } from '../../application/use-cases/get-inscripcions.use-case';
import { GetInscripcionByIdUseCase } from '../../application/use-cases/get-inscripcion-by-id.use-case';
import { UpdateInscripcionUseCase } from '../../application/use-cases/update-inscripcion.use-case';
import { DeleteInscripcionUseCase } from '../../application/use-cases/delete-inscripcion.use-case';
import { ConfirmBaucherUseCase } from '../../application/use-cases/confirm-baucher.use-case';
import { ConfirmInscripcionUseCase } from '../../application/use-cases/confirm-inscripcion.use-case';
import { BulkImportInscripcionUseCase } from '../../application/use-cases/bulk-import-inscripcion.use-case';
import { CreateInscripcionDto } from '../../application/dto/create-inscripcion.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';

@Controller('inscripciones-clean')
@UseGuards(JwtAuthGuard)
export class InscripcionController {
  constructor(
    private readonly createInscripcionUseCase: CreateInscripcionUseCase,
    private readonly getInscripcionsUseCase: GetInscripcionsUseCase,
    private readonly getInscripcionByIdUseCase: GetInscripcionByIdUseCase,
    private readonly updateInscripcionUseCase: UpdateInscripcionUseCase,
    private readonly deleteInscripcionUseCase: DeleteInscripcionUseCase,
    private readonly confirmBaucherUseCase: ConfirmBaucherUseCase,
    private readonly confirmInscripcionUseCase: ConfirmInscripcionUseCase,
    private readonly bulkImportUseCase: BulkImportInscripcionUseCase,
  ) {}

  @Post()
  create(@Body() dto: CreateInscripcionDto, @Req() req: any) {
    return this.createInscripcionUseCase.execute(dto, req.user?.id);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.getInscripcionsUseCase.execute(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.getInscripcionByIdUseCase.execute(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateInscripcionUseCase.execute(id, data, req.user?.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.deleteInscripcionUseCase.execute(id);
  }

  @Put('baucher/:baucherId/confirmar')
  confirmBaucher(
    @Param('baucherId') baucherId: string,
    @Body() body: { confirmed: boolean },
    @Req() req: any,
  ) {
    return this.confirmBaucherUseCase.execute(
      baucherId,
      body.confirmed,
      req.user?.id,
    );
  }

  @Put(':id/confirmar-inscripcion')
  confirmInscripcion(@Param('id') id: string, @Req() req: any) {
    return this.confirmInscripcionUseCase.execute(id, req.user?.id);
  }

  @Post('bulk')
  bulkImport(@Body() body: any, @Req() req: any) {
    return this.bulkImportUseCase.execute(body, req.user?.id);
  }
}
