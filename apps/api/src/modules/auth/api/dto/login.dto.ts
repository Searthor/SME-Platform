import { IsString, MaxLength, MinLength } from 'class-validator'

export class LoginDto {
  @IsString()
  @MaxLength(254)
  identifier!: string

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string

  @IsString()
  @MaxLength(120)
  deviceName!: string
}
