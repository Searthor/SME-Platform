import { IsIn, IsString, Length, MaxLength, MinLength } from 'class-validator'

export class RegisterDto {
  @IsString()
  @Length(2, 120)
  displayName!: string

  @IsString()
  @MaxLength(254)
  identifier!: string

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string

  @IsString()
  @Length(2, 160)
  businessName!: string

  @IsString()
  @Length(2, 160)
  branchName!: string

  @IsString()
  @Length(1, 40)
  branchCode!: string

  @IsIn(['LAK', 'THB', 'USD'])
  currencyCode!: string

  @IsString()
  @MaxLength(80)
  timezone!: string

  @IsString()
  @MaxLength(120)
  deviceName!: string
}
