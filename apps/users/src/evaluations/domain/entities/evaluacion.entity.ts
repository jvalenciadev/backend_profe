export class EvaluacionPeriodo {
    constructor(
        public id: string,
        public gestion: string,
        public semestre: string,
        public periodo: string,
        public activo: boolean,
        public estado: string,
        public criterios?: EvaluacionCriterio[],
    ) { }
}

export class EvaluacionCriterio {
    constructor(
        public id: string,
        public periodoId: string,
        public nombre: string,
        public puntajeMaximo: number,
        public orden: number,
    ) { }
}

export class EvaluacionAdmin {
    constructor(
        public id: string,
        public userId: string,
        public periodoId: string,
        public tenantId: string | null,
        public cargoId: string | null,
        public puntajeTotal: number,
        public codigoVerificacion: string,
        public qrCode: string | null,
        public estado: string,
        public createdBy: string | null,
        public updatedBy: string | null,
        public puntajes?: EvaluacionPuntaje[],
        public user?: any,
        public periodoEval?: EvaluacionPeriodo,
    ) { }
}

export class EvaluacionPuntaje {
    constructor(
        public id: string,
        public evaluacionId: string,
        public criterioId: string,
        public puntaje: number,
    ) { }
}
