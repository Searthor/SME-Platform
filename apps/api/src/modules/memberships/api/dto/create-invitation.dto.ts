import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsString, IsUUID, MaxLength } from 'class-validator'

export class CreateInvitationDto {
  @IsString()
  @MaxLength(254)
  identifier!: string

  @IsBoolean()
  allBranches!: boolean

  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('7', { each: true })
  branchIds!: string[]

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsUUID('7', { each: true })
  roleIds!: string[]
}
