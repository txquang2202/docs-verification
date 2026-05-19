import 'reflect-metadata';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { User, UserRole } from '../models/user.model';
import { Document } from '../models/document.model';
import { VerificationAttempt } from '../models/verification-attempt.model';
import { AuditEvent } from '../models/audit-event.model';
import { Dialect } from 'sequelize';

dotenv.config();

async function seed() {
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
      ssl: dbEncrypt
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : false,

      requestTimeout: 240000,
    },

    define: {
      timestamps: false,
      paranoid: false,
    },

    logging: true,

    models: [User, Document, VerificationAttempt, AuditEvent],
  };

  const sequelize = new Sequelize(sequelizeConfig);

  await sequelize.sync({ alter: true });

  const hashed = (pw: string) => bcrypt.hash(pw, 10);

  await User.upsert({
    email: 'seller@demo.com',
    password: await hashed('seller123'),
    role: UserRole.SELLER,
  });
  await User.upsert({
    email: 'admin@demo.com',
    password: await hashed('admin123'),
    role: UserRole.ADMIN,
  });

  console.log('✅ Seeded: seller@demo.com / seller123');
  console.log('✅ Seeded: admin@demo.com / admin123');

  await sequelize.close();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
