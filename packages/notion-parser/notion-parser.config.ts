/**
 * Configuration par défaut pour @notion-clipper/notion-parser
 */

export default {
    limits: {
        maxRichTextLength: 2000,
        maxBlocksPerRequest: 100,
        maxCodeLength: 2000,
        maxEquationLength: 1000,
        maxUrlLength: 2000,
        maxCaptionLength: 500,
        maxTableWidth: 5,
        maxBlockDepth: 3
    },

    colors: {
        default: 'default' as const,
        callout: {
            note: 'blue_background' as const,
            info: 'blue_background' as const,
            tip: 'green_background' as const,
            warning: 'yellow_background' as const,
            danger: 'red_background' as const,
            success: 'green_background' as const,
            question: 'purple_background' as const
        }
    },

    detection: {
        enableMarkdownDetection: true,
        enableCodeDetection: true,
        enableTableDetection: true,
        enableUrlDetection: true,
        enableHtmlDetection: true
    },

    conversion: {
        preserveFormatting: true,
        convertLinks: true,
        convertImages: true,
        convertTables: true,
        convertCode: true
    },

    validation: {
        strictMode: false,
        validateRichText: true,
        validateBlockStructure: true,
        maxBlockDepth: 3
    },

    formatting: {
        removeEmptyBlocks: true,
        normalizeWhitespace: true,
        maxConsecutiveEmptyLines: 2
    }
};