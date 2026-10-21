import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator'

export class UpdatePlatformSettingsDto {
  @IsString()
  @Length(2, 120)
  platformName!: string

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  supportEmail!: string | null

  @IsString()
  @Matches(/^[a-z]{2}(?:-[A-Z]{2})?$/)
  defaultLocale!: string

  @IsIn(['LAK', 'THB', 'USD'])
  defaultCurrencyCode!: 'LAK' | 'THB' | 'USD'

  @IsString()
  @MaxLength(80)
  defaultTimezone!: string

  @IsBoolean()
  allowRegistration!: boolean
}
