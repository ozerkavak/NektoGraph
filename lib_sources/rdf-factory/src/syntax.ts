/**
 * Utility for normalizing RDF-star and RDF 1.2 syntax variations.
 */
export class RDFSyntax {
    /**
     * Normalizes experimental RDF 1.2 "Triple Term" syntax <<( s p o )>> 
     * into standard RDF-star "Quoted Triple" syntax << s p o >>.
     * This ensures compatibility with parsers (N3.js, SparqlJS) that follow 
     * the RDF-star Community Group report.
     */
    static normalizeRdfStar(content: string): string {
        if (!content.includes('<<')) return content;
        
        return content
            .replace(/<<\s*\(\s*/g, '<< ')
            .replace(/\s*\)\s*>>/g, ' >>');
    }
}
