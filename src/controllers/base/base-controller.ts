export type ControllerResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export abstract class BaseController {
  protected ok<T>(data: T, message?: string): ControllerResult<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  protected fail(message: string): ControllerResult<never> {
    return {
      success: false,
      message,
    };
  }
}
