import { IsString, Length, MaxLength, MinLength } from 'class-validator'

export class AcceptInvitationDto {
  @IsString()
  @Length(2, 120)
  displayName!: string

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string
}
