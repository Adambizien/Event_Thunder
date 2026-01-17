import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'users_info' })
export class UsersInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @OneToOne(() => User, (user) => user.info, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50, nullable: true, default: '' })
  first_name: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, default: '' })
  last_name: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true, default: '' })
  phone_number: string | null;
}
