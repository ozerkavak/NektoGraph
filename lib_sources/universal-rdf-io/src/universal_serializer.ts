import * as N3 from 'n3';
import { JsonLdSerializer } from 'jsonld-streaming-serializer';

export interface SerializerOptions {
    format?: 'Turtle' | 'N-Triples' | 'N-Quads' | 'TriG' | 'JSON-LD';
    prefixes?: { [prefix: string]: string };
    baseIRI?: string;
}

/**
 * UniversalSerializer - Central service for RDF data export.
 * Supports various formats including Turtle, N-Quads, and JSON-LD.
 * 
 * @category Transport Layer
 */
export class UniversalSerializer {
    /**
     * Serializes an array or iterator of Quads into a string.
     * The input quads must be standard RDF/JS objects (subject, predicate, object, graph).
     * 
     * @param quads - Iterable of RDF/JS Quads.
     * @param options - Serialization settings including format, baseIRI and prefixes.
     * @returns Promise resolving to the serialized string.
     */
    public async serialize(quads: Iterable<any>, options: SerializerOptions = {}): Promise<string> {
        const format = options.format || 'Turtle';

        if (format === 'JSON-LD') {
            return this.serializeJsonLd(quads, options);
        }


        const writerOptions: any = {
            format: format as any,
            prefixes: options.prefixes,
            rdfStar: true // Vital for native RDF-star syntax (<< >>)
        };

        if (options.baseIRI) {
            writerOptions.baseIRI = options.baseIRI;
        }

        const writer = new N3.Writer(writerOptions);

        for (const quad of quads) {
            writer.addQuad(quad);
        }

        return new Promise((resolve, reject) => {
            writer.end((error: any, result: any) => {
                if (error) {
                    reject(error);
                } else {
                    let finalOutput = result;
                    // Implementation Note: N3.Writer might use baseIRI for relativization but NOT output the @base directive.
                    // We enforce it for formats that support it (Turtle, TriG) for better portability.
                    if (options.baseIRI && (format === 'Turtle' || format === 'TriG')) {
                        if (!finalOutput.trim().startsWith('@base')) {
                            finalOutput = `@base <${options.baseIRI}> .\n${finalOutput}`;
                        }
                    }
                    resolve(finalOutput);
                }
            });
        });
    }

    private serializeJsonLd(quads: Iterable<any>, _options: SerializerOptions): Promise<string> {
        return new Promise((resolve, reject) => {
            const serializer = new JsonLdSerializer({ space: '  ' });
            let output = '';

            serializer.on('data', (chunk: string) => output += chunk);
            serializer.on('error', (err: any) => reject(err));
            serializer.on('end', () => resolve(output));

            for (const quad of quads) {
                serializer.write(quad);
            }
            serializer.end();
        });
    }

}
