import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class AppConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getAppInfo() {
    const info = await this.prisma.profe.findFirst({
      where: { estado: 'activo' },
    });

    // Datos por defecto basados en lo solicitado por el usuario
    const defaultRespuesta = {
      id: 1,
      logo:
        info?.logoPrincipal ||
        'https://profe.minedu.gob.bo/backend/image/logoprofe2.png',
      icono: 'https://profe.minedu.gob.bo/backend/image/logo.jpg',
      nombre: info?.nombre || 'Programa PROFE',
      version_actual: '1.0.6',
      version_minima: '1.0.6',
      ultima_actualizacion: '2024-02-28',
      playstore_url:
        'https://play.google.com/store/apps/details?id=com.profe.aula',
      sitio_web: info?.pagina || 'https://profe.minedu.gob.bo',
      contacto_soporte: info?.correo || 'profecorreos@iipp.edu.bo',
      estado_mantenimiento: info?.mantenimiento || false,
      colors: {
        primary: info?.color || '#c9a751',
        secondary: info?.colorSecundario || '#0b6b66ff',
      },
      mision: info?.mision,
      vision: info?.vision,
      stats: {
        estudiantes: '50k+',
        cursos: '120+',
        sedes: '9 Sedes',
        satisfaccion: '98%',
      },
      pages: [
        {
          title: 'TU PUERTA AL ÉXITO PROFESIONAL',
          subtitle: 'Misión Institucional',
          body:
            info?.mision ||
            'Formamos líderes con excelencia académica. Aula Profe es un ecosistema digital diseñado para potenciar tu crecimiento profesional con estándares internacionales.',
          imageUrl:
            info?.banner ||
            'https://profe.minedu.gob.bo/frontend/images/bannerprofe.jpg',
          features: [
            'Excelencia Académica',
            'Liderazgo Regional',
            'Innovación Tecnológica',
          ],
        },
        {
          title: 'VISIÓN DE FUTURO SIN FRONTERAS',
          subtitle: 'Alcance Global',
          body:
            info?.vision ||
            'Ser referente nacional en educación técnica y tecnológica, integrando la vanguardia pedagógica con las demandas del mercado laboral global.',
          imageUrl: 'https://profe.minedu.gob.bo/frontend/images/eventos.jpg',
          features: [
            'Formación Continua',
            'Impacto Nacional',
            'Calidad Certificada',
          ],
        },
        {
          title: 'ESTADÍSTICAS QUE HABLAN POR NOSOTROS',
          subtitle: 'Nuestro Impacto',
          body: 'Únete a una comunidad en expansión. Más de 50,000 profesionales transformando su realidad a través de nuestros programas especializados.',
          imageUrl:
            'https://profe.minedu.gob.bo/frontend/images/ofertasacademicas.jpg',
          features: [
            'Sedes: 9 Departamentos',
            'Éxito laboral: 98%',
            'Cursos activos: 120+',
          ],
        },
        {
          title: 'TECNOLOGÍA DE PRÓXIMA GENERACIÓN',
          subtitle: 'Aula Profe 2.4',
          body: 'Tu formación no se detiene. Acceso multiplataforma, sincronización en tiempo real y descarga de contenidos para aprendizaje offline.',
          imageUrl: 'https://profe.minedu.gob.bo/backend/image/logoprofe2.png',
          features: ['Sincronización Total', 'Acceso Offline', 'Soporte 24/7'],
        },
      ],
      socials: [
        { platform: 'Facebook', url: 'https://facebook.com/profe' },
        { platform: 'YouTube', url: 'https://youtube.com/profe' },
        { platform: 'Web', url: info?.pagina || 'https://profe.minedu.gob.bo' },
      ],
      terminos_url: 'https://profe.minedu.gob.bo/terminos',
      privacidad_url: 'https://profe.minedu.gob.bo/privacidad',
    };

    return {
      status: 'success',
      codigo_http: 200,
      respuesta: defaultRespuesta,
      error: null,
    };
  }

  async getVersionMobile() {
    return {
      version: '1.0.6',
      url: 'https://profe.minedu.gob.bo/descargas/aula-profe.apk',
      force: false,
    };
  }
}
