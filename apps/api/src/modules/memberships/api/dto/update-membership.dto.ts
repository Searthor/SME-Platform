import { MemberStatus } from '@prisma/client'
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsUUID } from 'class-validator'

export class UpdateMembershipDto {
  @IsEnum(MemberStatus)
  status!: MemberStatus

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
