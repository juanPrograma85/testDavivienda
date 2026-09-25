import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export const SWAGGER_PATH = 'docs';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Flight Booking API')
    .setDescription(
      'API REST y SSE para vuelos, asientos, bloqueos temporales y pagos ficticios.',
    )
    .setVersion('1.0')
    .addTag('Flights', 'Busqueda y estado operativo de vuelos')
    .addTag('Seats', 'Mapa, bloqueos y liberacion de asientos')
    .addTag('Realtime', 'Eventos SSE por vuelo')
    .addTag('Dashboard', 'Metricas de ocupacion')
    .addBearerAuth()
    .build();

  SwaggerModule.setup(SWAGGER_PATH, app, SwaggerModule.createDocument(app, config), {
    jsonDocumentUrl: 'docs/openapi.json',
    customSiteTitle: 'Flight Booking API Docs',
  });
}