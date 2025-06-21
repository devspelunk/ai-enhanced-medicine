import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm'
import { Drug } from '../drugs/drugs.entity'

@Entity('ai_enhanced_content')
export class AIEnhancedContent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'drug_id' })
  drugId: string

  @Column({ name: 'seo_title', length: 70 })
  seoTitle: string

  @Column({ name: 'meta_description', length: 160 })
  metaDescription: string

  @Column({ name: 'enhanced_indications', type: 'text', nullable: true })
  enhancedIndications?: string

  @Column({ name: 'patient_friendly_description', type: 'text', nullable: true })
  patientFriendlyDescription?: string

  @Column({ name: 'provider_friendly_explanation', type: 'text', nullable: true })
  providerFriendlyExplanation?: string

  @Column({ name: 'related_conditions', type: 'text', array: true, default: () => "'{}'"})
  relatedConditions: string[]

  @Column({ name: 'related_drugs', type: 'text', array: true, default: () => "'{}'"})
  relatedDrugs: string[]

  @Column({ type: 'jsonb', nullable: true })
  faqs?: Array<{ question: string; answer: string }>

  @Column({ name: 'structured_data', type: 'jsonb', nullable: true })
  structuredData?: Record<string, any>

  @Column({ name: 'content_score', type: 'integer', default: 0 })
  contentScore: number

  @Column({ name: 'last_enhanced', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastEnhanced: Date

  @OneToOne(() => Drug, drug => drug.enhancedContent)
  @JoinColumn({ name: 'drug_id' })
  drug: Drug

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}