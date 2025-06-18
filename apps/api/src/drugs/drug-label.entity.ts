import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm'
import { Drug } from './drugs.entity'

@Entity('drug_labels')
export class DrugLabel {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  drugId: string

  @Column('text')
  indications: string

  @Column('text', { nullable: true })
  contraindications?: string

  @Column('text', { nullable: true })
  warnings?: string

  @Column('text', { nullable: true })
  precautions?: string

  @Column('text', { nullable: true })
  adverseReactions?: string

  @Column('text', { nullable: true })
  dosageAndAdministration?: string

  @Column('text', { nullable: true })
  howSupplied?: string

  @Column('text', { nullable: true })
  clinicalPharmacology?: string

  @Column('text', { nullable: true })
  mechanismOfAction?: string

  @Column('text', { nullable: true })
  pharmacokinetics?: string

  @OneToOne(() => Drug, drug => drug.label)
  @JoinColumn({ name: 'drugId' })
  drug: Drug

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}