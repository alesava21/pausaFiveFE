import { provideHttpClient, withInterceptors, withNoXsrfProtection } from '@angular/common/http';
import { apiInterceptor } from './api.interceptor';

export function provideApi() {
  // Il contratto usa token ottenuto da JSON: nessuna lettura di cookie da JS.
  return provideHttpClient(withNoXsrfProtection(), withInterceptors([apiInterceptor]));
}
