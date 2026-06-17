import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import { AuthenticationError } from "@/lib/auth/auth-errors";
import type { AuthLoginInputDto } from "@/models/dto/auth-login-input";
import type { AuthSessionOutputDto } from "@/models/dto/auth-session-output";
import { authLoginSchema } from "@/models/validators/auth-validator";
import { AuthService } from "@/services/auth/auth-service";

type AuthSessionInternalOutputDto = AuthSessionOutputDto & {
  token: string;
};

export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async login(
    input: AuthLoginInputDto,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<ControllerResult<AuthSessionInternalOutputDto>> {
    try {
      const payload = authLoginSchema.parse(input);
      const session = await this.authService.login({
        ...payload,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      return this.ok({
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          isPlatformAdmin: session.user.isPlatformAdmin,
        },
        company: {
          id: session.company.id,
          tradeName: session.company.tradeName,
          slug: session.company.slug,
        },
        permissions: session.permissions,
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return this.fail(error.message);
      }

      if (error instanceof Error) {
        return this.fail(error.message);
      }

      return this.fail("Unexpected error during login.");
    }
  }
}
