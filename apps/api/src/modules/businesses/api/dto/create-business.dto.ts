import { IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator'

export class CreateBusinessDto {
  @IsString()
  @Length(2, 160)
  name!: string

  @IsIn(['LAK', 'THB', 'USD'])
  currencyCode!: string

  @IsString()
  @MaxLength(80)
  timezone!: string

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{2,40}$/)
  branchCode?: string

  @IsOptional()
  @IsString()
  @Length(2, 160)
  branchName?: string
}
