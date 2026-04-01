export class ProduccionIntelectual {
  id: string;
  userId: string;
  titulo: string;
  anioPublicacion: number;
  estado: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ProduccionIntelectual>) {
    Object.assign(this, partial);
  }
}
