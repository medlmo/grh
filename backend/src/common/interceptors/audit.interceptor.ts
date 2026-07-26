import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Observable, tap } from 'rxjs';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
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
          .catch(() => {});
      }),
    );
  }
}
