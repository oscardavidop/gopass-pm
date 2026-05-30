import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const STATUS_I18N_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'validation.failed',
  [HttpStatus.UNAUTHORIZED]: 'auth.unauthorized',
  [HttpStatus.FORBIDDEN]: 'auth.forbidden',
  [HttpStatus.NOT_FOUND]: 'common.notFound',
  [HttpStatus.CONFLICT]: 'common.conflict',
  [HttpStatus.TOO_MANY_REQUESTS]: 'common.rateLimited',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'common.internalError',
};

const MESSAGE_KEY_MAP: Record<string, string> = {
  'no refresh token provided': 'auth.noRefreshToken',
  'invalid credentials': 'auth.invalidCredentials',
  'invalid or expired refresh token': 'auth.invalidRefreshToken',
  'refresh token revoked or expired': 'auth.invalidRefreshToken',
  'oauth provider not enabled yet': 'auth.oauthProviderDisabled',
  'oauth provider did not return a verified email': 'auth.oauthEmailNotVerified',
  'google oauth is not configured': 'auth.googleOAuthNotConfigured',
  'google oauth token exchange failed': 'auth.googleOAuthTokenExchangeFailed',
  'google oauth profile fetch failed': 'auth.googleOAuthProfileFetchFailed',
  'github oauth is not configured': 'auth.githubOAuthNotConfigured',
  'github oauth token exchange failed': 'auth.githubOAuthTokenExchangeFailed',
  'github oauth profile fetch failed': 'auth.githubOAuthProfileFetchFailed',
  'email already registered': 'auth.emailAlreadyRegistered',
  'username already taken': 'auth.usernameAlreadyTaken',
  'invalid or expired reset token': 'auth.invalidResetToken',
  'email previews are disabled when send_real_email=true': 'auth.emailPreviewsDisabled',
  'preview not found': 'auth.emailPreviewNotFound',
  'user not available': 'auth.userUnavailable',
  'user not found or inactive': 'auth.userNotFoundOrInactive',
  'insufficient permissions': 'auth.forbidden',
  'only project owner can remove members': 'auth.forbidden',
  'only project admins can update the project': 'project.adminUpdateOnly',
  'only project owner can delete the project': 'project.ownerDeleteOnly',
  'access denied to this project': 'project.accessDenied',
  'member not found in this project': 'project.memberNotFound',
  'cannot remove project owner': 'project.ownerCannotBeRemoved',
  'project not found': 'project.notFound',
  'task not found': 'task.notFound',
  'cannot delete this task': 'task.deleteForbidden',
  'comment not found': 'task.commentNotFound',
  'cannot delete this comment': 'task.commentDeleteForbidden',
  'subtask not found': 'task.subtaskNotFound',
  'invalid subtask order payload': 'task.invalidSubtaskOrderPayload',
  'invalid subtask ids in reorder payload': 'task.invalidSubtaskIdsPayload',
  'no access to this project': 'project.accessDenied',
  'description is required': 'ai.descriptionRequired',
  'ai rate limit exceeded. please try again in a few seconds.': 'ai.rateLimitExceeded',
  'failed to parse ai json response': 'ai.parseJsonFailed',
  'ai response schema validation failed': 'ai.schemaValidationFailed',
  'ai provider returned invalid json payload': 'ai.invalidJsonPayload',
  'workers ai returned empty response text': 'ai.emptyResponseText',
  'workers ai returned an error': 'ai.providerError',
  'ai provider is not configured. set cloudflare_account_id and cloudflare_api_token': 'ai.providerNotConfigured',
  'unsupported oauth provider': 'auth.oauthProviderUnsupported',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  private toI18nKey(status: number, message?: string | string[]) {
    if (Array.isArray(message) && message.length > 0) {
      const first = message[0];
      if (typeof first === 'string' && first.includes('.')) return first;
      return STATUS_I18N_MAP[status] || 'common.internalError';
    }

    if (typeof message === 'string') {
      if (message.includes('.')) return message;
      const mapped = MESSAGE_KEY_MAP[message.toLowerCase().trim()];
      if (mapped) return mapped;
    }

    return STATUS_I18N_MAP[status] || 'common.internalError';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'common.internalError';
    let i18nKey = 'common.internalError';
    let i18nParams: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as any;
        message = res.message ?? message;
        i18nKey = res.i18nKey ?? i18nKey;
        i18nParams = res.i18nParams;
      }

      if (!i18nKey || i18nKey === 'common.internalError') {
        i18nKey = this.toI18nKey(status, message);
      }
    } else {
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    }

    if (response.headersSent) {
      this.logger.warn(`Headers already sent for ${request.method} ${request.url}; skipping error response body`);
      return;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      i18nKey,
      i18nParams,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
