import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AuthenticatedUser } from '../types/authenticated-user';

type AuditedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditedRequest>();
    const method = request.method;
    // Journaliser uniquement les mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }
    return next.handle().pipe(
      tap(() => {
        this.prisma.auditLog
          .create({
            data: {
              utilisateurId: request.user?.id ?? null,
              action: `${method} ${request.url}`,
              entite: request.url.split('/').filter(Boolean)[1] ?? 'unknown',
              entiteId: request.params?.id ? Number(request.params.id) : null,
              ip: request.ip,
            },
          })
          .catch((error: unknown) => {
            this.logger.error(
              `Échec de journalisation de l'action ${method} ${request.url}`,
              error instanceof Error ? error.stack : String(error),
            );
          });
      }),
    );
  }
}
