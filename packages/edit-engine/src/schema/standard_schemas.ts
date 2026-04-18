import { PropertySchema } from './schema_index';

/**
 * Standard W3C Vocabulary Definitions for RDF, RDFS, and RDF-star.
 * These are injected into the SchemaIndex memory to provide labels and comments
 * for system predicates without polluting the physical quadstore.
 */
export const STANDARD_PROPERTIES: Record<string, Partial<PropertySchema>> = {
    // RDF Core
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': {
        labels: { en: 'type', tr: 'tip' },
        comments: { en: 'The subject is an instance of a class.', tr: 'Özne bir sınıfın örneğidir.' },
        type: 'Object'
    },

    // RDF-star
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies': {
        labels: { en: 'reifies', tr: 'niteler' },
        comments: { en: 'A property used to relate a reification term to the triple it describes.', tr: 'Bir niteleme terimini tanımladığı üçlüye bağlamak için kullanılan özelliktir.' },
        type: 'Object'
    },
    'http://www.w3.org/ns/rdf-star#occurrenceOf': {
        labels: { en: 'occurrence of', tr: 'vakası' },
        comments: { en: 'Standard predicate to link a triple occurrence to its ground triple.', tr: 'Bir üçlü vakasını temel aldığı üçlüye bağlayan standart predikat.' },
        type: 'Object'
    },
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#occurrenceOf': {
        labels: { en: 'occurrence of', tr: 'vakası' },
        comments: { en: 'RDF-namespace variant of the occurrenceOf predicate.', tr: 'occurrenceOf predikatının RDF-namespace varyantı.' },
        type: 'Object'
    },

    // RDFS
    'http://www.w3.org/2000/01/rdf-schema#label': {
        labels: { en: 'label', tr: 'etiket' },
        comments: { en: 'A human-readable name for the subject.', tr: 'Özne için insan tarafından okunabilir bir isim.' },
        type: 'Data'
    },
    'http://www.w3.org/2000/01/rdf-schema#comment': {
        labels: { en: 'comment', tr: 'açıklama' },
        comments: { en: 'A description of the subject resource.', tr: 'Özne kaynağının bir açıklaması.' },
        type: 'Data'
    },
    'http://www.w3.org/2000/01/rdf-schema#isDefinedBy': {
        labels: { en: 'isDefinedBy', tr: 'tarafındanTanımlanır' },
        comments: { en: 'The definition of the subject resource.', tr: 'Özne kaynağının tanımı.' },
        type: 'Object'
    },
    'http://www.w3.org/2000/01/rdf-schema#seeAlso': {
        labels: { en: 'seeAlso', tr: 'ayrıcaBakınız' },
        comments: { en: 'Further information about the subject resource.', tr: 'Özne kaynağı hakkında daha fazla bilgi.' },
        type: 'Object'
    },
    'http://www.w3.org/2000/01/rdf-schema#subClassOf': {
        labels: { en: 'subClassOf', tr: 'altSınıfıdır' },
        comments: { en: 'The subject is a subclass of a class.', tr: 'Özne bir sınıfın alt sınıfıdır.' },
        type: 'Object'
    },
    'http://www.w3.org/2000/01/rdf-schema#subPropertyOf': {
        labels: { en: 'subPropertyOf', tr: 'altÖzelliğidir' },
        comments: { en: 'The subject is a subproperty of a property.', tr: 'Özne bir özelliğin alt özelliğidir.' },
        type: 'Object'
    },
    'http://www.w3.org/2000/01/rdf-schema#domain': {
        labels: { en: 'domain', tr: 'alan' },
        comments: { en: 'A domain of the subject property.', tr: 'Özne özelliğinin bir alanı (domain).' },
        type: 'Object'
    },
    'http://www.w3.org/2000/01/rdf-schema#range': {
        labels: { en: 'range', tr: 'erim' },
        comments: { en: 'A range of the subject property.', tr: 'Özne özelliğinin bir erimi (range).' },
        type: 'Object'
    }
};
