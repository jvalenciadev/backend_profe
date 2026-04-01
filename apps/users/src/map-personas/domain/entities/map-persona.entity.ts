export class MapPersona {
  id: string;
  ci: string;
  complemento?: string;
  nombre1: string;
  nombre2?: string;
  apellido1: string;
  apellido2?: string;
  rda?: number;
  celular: number;
  correo: string;
  estado: string;
  cargo?: { id: string; nombre: string };
  categoria?: { id: string; nombre: string };
  nivel?: { id: string; nombre: string };
  subsistema?: { id: string; nombre: string };
}
