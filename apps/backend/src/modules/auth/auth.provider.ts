import { Provider } from '@nestjs/common';
import { User } from 'src/database/models/user.model';

export const authProvider: Provider[] = [
  {
    provide: 'USER_REPOSITORY',
    useValue: User,
  },
];
