import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsIn, IsString, MaxLength, MinLength } from 'class-validator'
import { permissionDefinitions, type PermissionCode } from '../../domain/permission-catalog'

const permissionCodes = permissionDefinitions.map(permission => permission.code)

export class UpdateRoleDto {
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
