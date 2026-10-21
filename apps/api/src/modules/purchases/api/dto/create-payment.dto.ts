import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator'
import { MONEY_MESSAGE, MONEY_PATTERN } from '../../../../common/validation/decimal-patterns'
import { PaymentMethod } from '@prisma/client'

export class CreatePurchasePaymentDto {
  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  @IsNotEmpty()
  amount!: string

  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod

  @IsDateString()
  @IsOptional()
  paidAt?: string

  @IsString()
  @IsOptional()
  @MaxLength(120)
  reference?: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string
}
