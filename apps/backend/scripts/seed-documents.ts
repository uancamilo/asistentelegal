import { PrismaClient, DocumentType, DocumentScope, DocumentStatus } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Mapeo de tipo de documento a nivel jerárquico
const hierarchyMap: Record<DocumentType, number> = {
  CONSTITUCION: 1,
  TRATADO_INTERNACIONAL: 2,
  LEY_ORGANICA: 3,
  LEY_ORDINARIA: 4,
  DECRETO_LEY: 5,
  DECRETO: 6,
  REGLAMENTO: 7,
  ORDENANZA: 8,
  RESOLUCION: 9,
  ACUERDO: 10,
  CIRCULAR: 11,
  DIRECTIVA: 12,
  OTRO: 13,
};

// Generar vector de embeddings dummy (1536 dimensiones con valores pequeños)
function generateDummyEmbedding(): number[] {
  return new Array(1536).fill(0).map(() => Math.random() * 0.01);
}

// Datos de ejemplo para generar documentos variados
const documentTemplates = [
  { type: DocumentType.CONSTITUCION, entity: 'Asamblea Nacional Constituyente', scope: DocumentScope.NACIONAL },
  { type: DocumentType.LEY_ORGANICA, entity: 'Congreso de la República', scope: DocumentScope.NACIONAL },
  { type: DocumentType.LEY_ORGANICA, entity: 'Congreso de la República', scope: DocumentScope.NACIONAL },
  { type: DocumentType.LEY_ORDINARIA, entity: 'Congreso de la República', scope: DocumentScope.NACIONAL },
  { type: DocumentType.LEY_ORDINARIA, entity: 'Congreso de la República', scope: DocumentScope.NACIONAL },
  { type: DocumentType.LEY_ORDINARIA, entity: 'Congreso de la República', scope: DocumentScope.NACIONAL },
  { type: DocumentType.DECRETO_LEY, entity: 'Presidencia de la República', scope: DocumentScope.NACIONAL },
  { type: DocumentType.DECRETO, entity: 'Presidencia de la República', scope: DocumentScope.NACIONAL },
  { type: DocumentType.DECRETO, entity: 'Ministerio de Justicia', scope: DocumentScope.NACIONAL },
  { type: DocumentType.DECRETO, entity: 'Ministerio del Interior', scope: DocumentScope.NACIONAL },
  { type: DocumentType.REGLAMENTO, entity: 'Ministerio de Educación', scope: DocumentScope.NACIONAL },
  { type: DocumentType.REGLAMENTO, entity: 'Ministerio de Salud', scope: DocumentScope.NACIONAL },
  { type: DocumentType.ORDENANZA, entity: 'Concejo Municipal de Bogotá', scope: DocumentScope.MUNICIPAL },
  { type: DocumentType.ORDENANZA, entity: 'Concejo Municipal de Medellín', scope: DocumentScope.MUNICIPAL },
  { type: DocumentType.ORDENANZA, entity: 'Concejo Municipal de Cali', scope: DocumentScope.MUNICIPAL },
  { type: DocumentType.RESOLUCION, entity: 'DIAN', scope: DocumentScope.NACIONAL },
  { type: DocumentType.RESOLUCION, entity: 'Superintendencia de Industria y Comercio', scope: DocumentScope.NACIONAL },
  { type: DocumentType.RESOLUCION, entity: 'Ministerio de Trabajo', scope: DocumentScope.NACIONAL },
  { type: DocumentType.ACUERDO, entity: 'Junta Directiva del Banco de la República', scope: DocumentScope.NACIONAL },
  { type: DocumentType.ACUERDO, entity: 'Consejo Superior de la Judicatura', scope: DocumentScope.NACIONAL },
  { type: DocumentType.CIRCULAR, entity: 'Superintendencia Financiera', scope: DocumentScope.NACIONAL },
  { type: DocumentType.CIRCULAR, entity: 'Contraloría General de la República', scope: DocumentScope.NACIONAL },
  { type: DocumentType.DIRECTIVA, entity: 'Presidencia de la República', scope: DocumentScope.NACIONAL },
  { type: DocumentType.DIRECTIVA, entity: 'Procuraduría General de la Nación', scope: DocumentScope.NACIONAL },
  { type: DocumentType.TRATADO_INTERNACIONAL, entity: 'Ministerio de Relaciones Exteriores', scope: DocumentScope.INTERNACIONAL },
  { type: DocumentType.TRATADO_INTERNACIONAL, entity: 'Organización de Estados Americanos', scope: DocumentScope.INTERNACIONAL },
  { type: DocumentType.REGLAMENTO, entity: 'Gobernación de Antioquia', scope: DocumentScope.REGIONAL },
  { type: DocumentType.RESOLUCION, entity: 'Alcaldía de Barranquilla', scope: DocumentScope.LOCAL },
  { type: DocumentType.OTRO, entity: 'Diversos', scope: DocumentScope.NACIONAL },
  { type: DocumentType.OTRO, entity: 'Autoridad Local', scope: DocumentScope.LOCAL },
];

const subjects = [
  'Derecho Constitucional',
  'Derecho Administrativo',
  'Derecho Laboral',
  'Derecho Tributario',
  'Derecho Penal',
  'Derecho Civil',
  'Derecho Comercial',
  'Derecho Ambiental',
  'Derechos Humanos',
  'Procedimiento Administrativo',
];

const keywordSets = [
  ['constitución', 'derechos fundamentales', 'garantías'],
  ['ley', 'congreso', 'normativa'],
  ['decreto', 'ejecutivo', 'reglamentación'],
  ['ordenanza', 'municipal', 'local'],
  ['tributario', 'impuestos', 'fiscal'],
  ['laboral', 'trabajo', 'empleo'],
  ['penal', 'delitos', 'sanciones'],
  ['civil', 'contratos', 'obligaciones'],
  ['ambiental', 'sostenibilidad', 'recursos naturales'],
  ['administrativo', 'procedimiento', 'autoridades'],
];

async function main() {
  console.log('🚀 Starting document seeding...\n');

  // ==========================================
  // STEP 1: Buscar usuario EDITOR
  // ==========================================
  const editor = await prisma.user.findFirst({
    where: { role: 'EDITOR' },
  });

  if (!editor) {
    console.error('❌ ERROR: EDITOR user not found.');
    console.error('   Please run: npm run init-admins\n');
    process.exit(1);
  }

  console.log('✅ EDITOR user found:');
  console.log(`   ID: ${editor.id}`);
  console.log(`   Email: ${editor.email}\n`);

  // ==========================================
  // STEP 2: Verificar documentos existentes
  // ==========================================
  const existingCount = await prisma.document.count();
  console.log(`📊 Existing documents: ${existingCount}\n`);

  // ==========================================
  // STEP 3: Crear 30 documentos
  // ==========================================
  console.log('🔄 Creating 30 sample documents...\n');

  const currentYear = new Date().getFullYear();
  const documents = [];

  for (let i = 0; i < 30; i++) {
    const template = documentTemplates[i]!; // Non-null assertion
    const year = currentYear - Math.floor(Math.random() * 5); // Años entre 2020-2025
    const number = Math.floor(Math.random() * 999) + 1;
    const subject = subjects[i % subjects.length]!;

    const doc = {
      title: `${template.type.replace(/_/g, ' ')} ${number} de ${year}`,
      documentNumber: `${number}/${year}`,
      abbreviation: `${template.type.substring(0, 3)}-${number}/${year.toString().substring(2)}`,
      type: template.type,
      hierarchyLevel: hierarchyMap[template.type],
      scope: template.scope,
      subject: subject,
      tags: [`documento-${i + 1}`, 'normativa', 'legal'],
      issuingEntity: template.entity,
      issuingEntityType: template.entity.includes('Ministerio') ? 'Ministerio' :
                         template.entity.includes('Congreso') ? 'Congreso' :
                         template.entity.includes('Presidencia') ? 'Presidencia' : 'Otro',
      issueDate: new Date(year, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      publicationDate: new Date(year, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      effectiveDate: new Date(year, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      isActive: Math.random() > 0.2, // 80% activos
      status: i < 25 ? DocumentStatus.PUBLISHED : DocumentStatus.DRAFT, // 25 publicados, 5 borradores
      summary: `Resumen del documento ${i + 1}. Este es un documento de prueba que regula aspectos relacionados con ${subject.toLowerCase()}. Contiene disposiciones importantes para la aplicación de la normativa vigente.`,
      fullText: `ARTÍCULO 1. OBJETO. El presente documento tiene por objeto establecer las normas relacionadas con ${subject.toLowerCase()}.\n\nARTÍCULO 2. ÁMBITO DE APLICACIÓN. Las disposiciones contenidas en este documento se aplicarán en todo el territorio ${template.scope.toLowerCase()}.\n\nARTÍCULO 3. DEFINICIONES. Para efectos de la interpretación y aplicación del presente documento, se establecen las siguientes definiciones.\n\nARTÍCULO 4. DISPOSICIONES GENERALES. Se establecen las siguientes disposiciones de carácter general.`,
      observations: i % 3 === 0 ? `Documento de prueba número ${i + 1} para desarrollo.` : null,
      embedding: generateDummyEmbedding(),
      keywords: keywordSets[i % keywordSets.length]!,
      createdBy: editor.id,
      updatedBy: Math.random() > 0.5 ? editor.id : null,
      publishedBy: i < 25 ? editor.id : null, // Solo los publicados tienen publishedBy
      publishedAt: i < 25 ? new Date(year, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1) : null,
    };

    documents.push(doc);
  }

  // Crear todos los documentos en una transacción
  try {
    const created = await prisma.$transaction(
      documents.map((doc) => prisma.document.create({ data: doc }))
    );

    console.log(`✅ Successfully created ${created.length} documents\n`);

    // ==========================================
    // STEP 4: Resumen final
    // ==========================================
    console.log('═══════════════════════════════════════');
    console.log('✅ Document seeding completed!\n');

    const totalDocs = await prisma.document.count();
    const publishedDocs = await prisma.document.count({ where: { status: DocumentStatus.PUBLISHED } });
    const draftDocs = await prisma.document.count({ where: { status: DocumentStatus.DRAFT } });

    console.log('📊 Summary:');
    console.log(`   Total documents: ${totalDocs}`);
    console.log(`   Published: ${publishedDocs}`);
    console.log(`   Drafts: ${draftDocs}\n`);

    const docsByType = await prisma.document.groupBy({
      by: ['type'],
      _count: true,
    });

    console.log('   Documents by type:');
    docsByType.forEach((group) => {
      console.log(`   - ${group.type}: ${group._count}`);
    });

    console.log('═══════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ TRANSACTION FAILED: Error creating documents.');
    console.error('   Error details:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('\n❌ Fatal error during document seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
