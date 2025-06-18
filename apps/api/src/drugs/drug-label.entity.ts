import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm'
import { Drug } from './drugs.entity'

@Entity('drug_labels')
export class DrugLabel {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'drug_id' })
  drugId: string

  // Core FDA label fields from label-schema.json
  @Column({ name: 'generic_name', nullable: true })
  genericName?: string

  @Column({ name: 'labeler_name', nullable: true })
  labelerName?: string

  @Column({ name: 'product_type', nullable: true })
  productType?: string

  @Column({ name: 'effective_time', length: 50, nullable: true })
  effectiveTime?: string

  @Column({ nullable: true })
  title?: string

  // Main content sections (TEXT for large HTML content)
  @Column({ name: 'indications_and_usage', type: 'text', nullable: true })
  indicationsAndUsage?: string

  @Column({ name: 'dosage_and_administration', type: 'text', nullable: true })
  dosageAndAdministration?: string

  @Column({ name: 'dosage_forms_and_strengths', type: 'text', nullable: true })
  dosageFormsAndStrengths?: string

  @Column({ type: 'text', nullable: true })
  contraindications?: string

  @Column({ name: 'warnings_and_precautions', type: 'text', nullable: true })
  warningsAndPrecautions?: string

  @Column({ name: 'adverse_reactions', type: 'text', nullable: true })
  adverseReactions?: string

  @Column({ name: 'clinical_pharmacology', type: 'text', nullable: true })
  clinicalPharmacology?: string

  @Column({ name: 'clinical_studies', type: 'text', nullable: true })
  clinicalStudies?: string

  @Column({ name: 'how_supplied', type: 'text', nullable: true })
  howSupplied?: string

  @Column({ name: 'use_in_specific_populations', type: 'text', nullable: true })
  useInSpecificPopulations?: string

  @Column({ type: 'text', nullable: true })
  description?: string

  @Column({ name: 'nonclinical_toxicology', type: 'text', nullable: true })
  nonclinicalToxicology?: string

  @Column({ name: 'instructions_for_use', type: 'text', nullable: true })
  instructionsForUse?: string

  @Column({ name: 'mechanism_of_action', type: 'text', nullable: true })
  mechanismOfAction?: string

  @Column({ type: 'text', nullable: true })
  highlights?: string

  // Legacy fields for backward compatibility
  @Column('text', { nullable: true })
  indications?: string

  @Column('text', { nullable: true })
  warnings?: string

  @Column('text', { nullable: true })
  precautions?: string

  @Column('text', { nullable: true })
  pharmacokinetics?: string

  @OneToOne(() => Drug, drug => drug.label)
  @JoinColumn({ name: 'drug_id' })
  drug: Drug

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}