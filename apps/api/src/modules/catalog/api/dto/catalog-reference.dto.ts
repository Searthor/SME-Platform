import { Transform } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator'

export class CreateCategoryDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 120)
  name!: string

  @IsOptional()
  @IsUUID('7')
  parentId?: string
}

export class UpdateCategoryDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 120)
  name!: string
}

export class CreateUnitDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsString()
  @Length(1, 30)
  code!: string

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 80)
  name!: string

  @IsInt()
  @Min(0)
  @Max(6)
  decimalPlaces!: number
}

export class UpdateUnitDto extends CreateUnitDto {
  @IsBoolean()
  active!: boolean
}
