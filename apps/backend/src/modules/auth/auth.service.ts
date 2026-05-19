import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from 'src/shared/enums/user-roles.enum';
import { User } from 'src/database/models/user.model';

@Injectable()
export class AuthService {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly usersRepository: typeof User,
    private jwtService: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    role: UserRole = UserRole.SELLER,
  ) {
    const exists = await this.usersRepository.findOne({
      where: { email },
    });

    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await this.usersRepository.create({
      email,
      password: hashed,
      role,
    });

    return this.issueToken(user);
  }

  async login(email: string, password: string) {
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueToken(user);
  }

  async findById(id: string) {
    return this.usersRepository.findByPk(id);
  }

  private issueToken(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),

      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
