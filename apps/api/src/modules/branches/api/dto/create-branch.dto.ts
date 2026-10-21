import { IsString, Length } from 'class-validator'

export class CreateBranchDto {
  @IsString()
  @Length(1, 40)
  code!: string

  @IsString()
  @Length(2, 160)
  name!: string
}
