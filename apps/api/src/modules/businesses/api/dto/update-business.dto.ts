import { IsIn, IsString, Length, MaxLength } from 'class-validator'

export class UpdateBusinessDto {
  @IsString()
  @Length(2, 160)
  name!: string

  @IsIn(['LAK', 'THB', 'USD'])
  currencyCode!: string

  @IsString()
  @MaxLength(80)
  timezone!: string
}
