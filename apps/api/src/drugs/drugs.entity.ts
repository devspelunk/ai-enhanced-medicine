import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm'
import { DrugLabel } from './drug-label.entity'
import { AIEnhancedContent } from '../ai-content/ai-enhanced-content.entity'

@Entity('drugs')
export class Drug {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ nullable: true })
  genericName?: string

  @Column({ nullable: true })
  brandName?: string

  @Column()
  manufacturer: string

  @Column()
  dosageForm: string

  @Column()
  strength: string

  @Column()
  route: string

  @Column({ unique: true, nullable: true })
  ndc?: string

  @Column({ nullable: true })
  fdaApplicationNumber?: string

  @Column({ type: 'date', nullable: true })
  approvalDate?: string

  @OneToOne(() => DrugLabel, drugLabel => drugLabel.drug)
  label?: DrugLabel

  @OneToMany(() => AIEnhancedContent, aiContent => aiContent.drug)
  enhancedContent?: AIEnhancedContent[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}