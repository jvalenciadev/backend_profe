export class Posgrado {
  id: string;
  userId: string;
  tipoPosgradoId: string;
  titulo: string;
  fecha: Date;
  imagen?: string | null;
  estado: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  tipoPosgrado?: any;

  constructor(partial: Partial<Posgrado>) {
    Object.assign(this, partial);
  }
}
