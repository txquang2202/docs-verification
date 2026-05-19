import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { ConfigService } from '@nestjs/config';
import { User } from './models/user.model';
import { Document } from './models/document.model';
import { VerificationAttempt } from './models/verification-attempt.model';
import { AuditEvent } from './models/audit-event.model';
import { Dialect } from 'sequelize';

export const databaseProviders = [
  {
    provide: 'SEQUELIZE',
    inject: [ConfigService],
    useFactory: async (config: ConfigService) => {
      const models: any = [User, Document, VerificationAttempt, AuditEvent];
      const dbHost = process.env.DB_HOST;
      const dbPort = parseInt(process.env.DB_PORT, 10);
      const dbUsername = process.env.DB_USERNAME;
      const dbPassword = process.env.DB_PASSWORD;
      const dbName = process.env.DB_NAME;
      const dbEncrypt = process.env.DB_ENCRYPT === 'true';

      const sequelizeConfig: SequelizeOptions = {
        dialect: 'postgres' as Dialect,
        host: dbHost,
        port: dbPort,
        username: dbUsername,
        password: dbPassword,
        database: dbName,
        dialectOptions: {
          encrypt: dbEncrypt,
          requestTimeout: 240000,
        },
        define: {
          timestamps: false,
          paranoid: false,
        },
        logging: true,
        models: models,
      };
      const sequelize = new Sequelize(sequelizeConfig);

      await sequelize.sync({ alter: config.get('NODE_ENV') !== 'production' });
      return sequelize;
    },
  },
];
