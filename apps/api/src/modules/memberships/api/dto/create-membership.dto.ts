import { ArrayMaxSize, IsArray, IsBoolean, IsString, IsUUID, MaxLength } from 'class-validator'

export class CreateMembershipDto {
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
  @ArrayMaxSize(20)
  @IsUUID('7', { each: true })
  roleIds!: string[]
}
