import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Drug } from '../drugs/drugs.entity'

@Entity('ai_enhanced_content')
export class AIEnhancedContent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  drugId: string

  @Column({ length: 70 })
  seoTitle: string

  @Column({ length: 160 })
  metaDescription: string

  @Column('text', { nullable: true })
  enhancedIndications?: string

  @Column('text', { nullable: true })
  patientFriendlyDescription?: string

  @Column('text', { nullable: true })
  providerFriendlyExplanation?: string

  @Column('text', { array: true, default: [] })
  relatedConditions: string[]

  @Column('text', { array: true, default: [] })
  relatedDrugs: string[]

  @Column('jsonb', { nullable: true })
  faqs?: Array<{ question: string; answer: string }>

  @Column('jsonb', { nullable: true })
  structuredData?: Record<string, any>

  @Column('integer', { nullable: true })
  contentScore?: number

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastEnhanced: Date

  @ManyToOne(() => Drug, drug => drug.enhancedContent)
  @JoinColumn({ name: 'drugId' })
  drug: Drug

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}