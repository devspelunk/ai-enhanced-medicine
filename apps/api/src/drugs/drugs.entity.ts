import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToOne as OneToOneRel } from 'typeorm'
import { DrugLabel } from './drug-label.entity'
import { AIEnhancedContent } from '../ai-content/ai-enhanced-content.entity'

@Entity('drugs')
export class Drug {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'drug_name' })
  drugName: string

  @Column({ name: 'set_id', unique: true })
  setId: string

  @Column({ unique: true })
  slug: string

  @Column()
  labeler: string

  // Legacy fields for backward compatibility
  @Column({ nullable: true })
  name?: string

  @Column({ name: 'generic_name', nullable: true })
  genericName?: string

  @Column({ name: 'brand_name', nullable: true })
  brandName?: string

  @Column({ nullable: true })
  manufacturer?: string

  @Column({ name: 'dosage_form', nullable: true })
  dosageForm?: string

  @Column({ nullable: true })
  strength?: string

  @Column({ nullable: true })
  route?: string

  @Column({ unique: true, nullable: true })
  ndc?: string

  @Column({ name: 'fda_application_number', nullable: true })
  fdaApplicationNumber?: string

  @Column({ name: 'approval_date', type: 'date', nullable: true })
  approvalDate?: string

  @OneToOne(() => DrugLabel, drugLabel => drugLabel.drug)
  label?: DrugLabel

  @OneToOneRel(() => AIEnhancedContent, aiContent => aiContent.drug)
  enhancedContent?: AIEnhancedContent

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}