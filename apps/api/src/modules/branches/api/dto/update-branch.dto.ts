import { BranchStatus } from '@prisma/client'
import { IsEnum, IsString, Length } from 'class-validator'

export class UpdateBranchDto {
  @IsString()
  @Length(1, 40)
  code!: string

  @IsString()
  @Length(2, 160)
  name!: string

  @IsEnum(BranchStatus)
  status!: BranchStatus
}
