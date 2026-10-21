import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { permissionDefinitions, type PermissionCode } from '../../domain/permission-catalog'

const permissionCodes = permissionDefinitions.map(permission => permission.code)

export class CreateRoleDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  @MinLength(2)
  @MaxLength(60)
  code!: string

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(permissionCodes.length)
  @IsIn(permissionCodes, { each: true })
  permissionCodes!: PermissionCode[]
}
