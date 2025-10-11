/**
 * Tests unitaires pour Table Headers - Nouvelle fonctionnalité v2.1
 * Couvre la détection automatique des headers de colonnes et lignes
 */

import { parseContent } from '../../../src/parseContent';
import type { NotionBlock } from '../../../src/types';

describe('Table Headers Parser - Nouvelle fonctionnalité v2.1 ⭐', () => {
  describe('Column Header Detection (has_column_header)', () => {
    it('should detect column headers in CSV with text headers', () => {
      const csvWithHeaders = `Name,Age,Department,Salary
John Doe,30,Engineering,75000
Jane Smith,28,Design,68000
Bob Johnson,35,Marketing,72000`;
      
      const result = parseContent(csvWithHeaders, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.type).toBe('table');
      expect(tableBlock.table.has_column_header).toBe(true);
      expect(tableBlock.table.has_row_header).toBe(false);
    });

    it('should detect column headers in TSV format', () => {
      const tsvWithHeaders = `Product\tPrice\tCategory\tStock
Laptop\t999.99\tElectronics\t50
Mouse\t29.99\tElectronics\t200
Desk\t299.99\tFurniture\t15`;
      
      const result = parseContent(tsvWithHeaders, { contentType: 'tsv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_column_header).toBe(true);
    });

    it('should detect column headers in Markdown tables', () => {
      const markdownTable = `| Name | Age | City |
|------|-----|------|
| John | 30  | NYC  |
| Jane | 25  | LA   |
| Bob  | 35  | SF   |`;
      
      const result = parseContent(markdownTable, { contentType: 'markdown' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks.find((block: any) => block.type === 'table') as any;
      expect(tableBlock).toBeDefined();
      expect(tableBlock.table.has_column_header).toBe(true);
    });

    it('should NOT detect headers when first row contains only numbers', () => {
      const csvWithoutHeaders = `1,2,3,4
5,6,7,8
9,10,11,12`;
      
      const result = parseContent(csvWithoutHeaders, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_column_header).toBe(false);
    });

    it('should NOT detect headers when first row is mixed data', () => {
      const csvMixedData = `john@email.com,30,2023-01-15,active
jane@email.com,25,2023-02-20,inactive
bob@email.com,35,2023-03-10,active`;
      
      const result = parseContent(csvMixedData, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_column_header).toBe(false);
    });

    it('should use heuristics for header detection', () => {
      // Test case: First row has capitalized words, second row has data
      const csvWithGoodHeaders = `First Name,Last Name,Email Address,Phone Number
john,doe,john@example.com,555-1234
jane,smith,jane@example.com,555-5678`;
      
      const result = parseContent(csvWithGoodHeaders, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_column_header).toBe(true);
    });
  });

  describe('Row Header Detection (has_row_header)', () => {
    it('should detect row headers when first column contains labels', () => {
      const csvWithRowHeaders = `Metric,Q1,Q2,Q3,Q4
Revenue,100000,120000,110000,130000
Expenses,80000,85000,82000,88000
Profit,20000,35000,28000,42000`;
      
      const result = parseContent(csvWithRowHeaders, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_column_header).toBe(true);
      expect(tableBlock.table.has_row_header).toBe(true);
    });

    it('should detect row headers in financial data', () => {
      const financialData = `Account,Jan,Feb,Mar
Assets,50000,52000,54000
Liabilities,30000,31000,32000
Equity,20000,21000,22000`;
      
      const result = parseContent(financialData, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_row_header).toBe(true);
    });

    it('should NOT detect row headers when first column is data', () => {
      const csvWithoutRowHeaders = `1,Apple,Red,Sweet
2,Banana,Yellow,Sweet
3,Orange,Orange,Citrus`;
      
      const result = parseContent(csvWithoutRowHeaders, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_row_header).toBe(false);
    });
  });

  describe('Complex Header Scenarios', () => {
    it('should handle tables with both column and row headers', () => {
      const complexTable = `Region,North,South,East,West
Sales,1000,1200,800,900
Marketing,200,250,150,180
Support,100,120,80,90`;
      
      const result = parseContent(complexTable, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_column_header).toBe(true);
      expect(tableBlock.table.has_row_header).toBe(true);
    });

    it('should handle tables with neither column nor row headers', () => {
      const dataOnlyTable = `1,2,3,4
5,6,7,8
9,10,11,12
13,14,15,16`;
      
      const result = parseContent(dataOnlyTable, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_column_header).toBe(false);
      expect(tableBlock.table.has_row_header).toBe(false);
    });

    it('should handle single-row tables', () => {
      const singleRowTable = `Name,Age,City`;
      
      const result = parseContent(singleRowTable, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_column_header).toBe(false); // Can't determine with single row
    });

    it('should handle single-column tables', () => {
      const singleColumnTable = `Names
John
Jane
Bob`;
      
      const result = parseContent(singleColumnTable, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_column_header).toBe(true);
    });
  });

  describe('Header Detection Options', () => {
    it('should respect detectTableHeaders option', () => {
      const csvWithHeaders = `Name,Age,City
John,30,NYC
Jane,25,LA`;
      
      const withDetection = parseContent(csvWithHeaders, {
        contentType: 'csv',
        conversion: { convertTables: true }
      });
      
      const withoutDetection = parseContent(csvWithHeaders, {
        contentType: 'csv',
        conversion: { convertTables: false }
      });
      
      expect(withDetection.success).toBe(true);
      expect(withoutDetection.success).toBe(true);
      
      const withHeaders = withDetection.blocks[0] as any;
      const withoutHeaders = withoutDetection.blocks[0] as any;
      
      expect(withHeaders.table.has_column_header).toBe(true);
      expect(withoutHeaders.table.has_column_header).toBe(false);
    });
  });

  describe('Table Structure Validation', () => {
    it('should create valid Notion table structure with headers', () => {
      const csvTable = `Product,Price,Available
Laptop,999.99,Yes
Mouse,29.99,Yes
Keyboard,79.99,No`;
      
      const result = parseContent(csvTable, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      
      // Validate complete table structure
      expect(tableBlock).toMatchObject({
        type: 'table',
        table: {
          table_width: 3,
          has_column_header: true,
          has_row_header: false,
          children: expect.any(Array)
        }
      });
      
      // Validate table rows
      expect(tableBlock.table.children).toHaveLength(4); // Header + 3 data rows
      tableBlock.table.children.forEach((row: any) => {
        expect(row.type).toBe('table_row');
        expect(row.table_row.cells).toHaveLength(3);
      });
    });

    it('should handle tables exceeding Notion column limit', () => {
      const wideTable = `A,B,C,D,E,F,G,H
1,2,3,4,5,6,7,8
9,10,11,12,13,14,15,16`;
      
      const result = parseContent(wideTable, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      
      // Should limit to 5 columns (Notion limit)
      expect(tableBlock.table.table_width).toBeLessThanOrEqual(5);
    });

    it('should preserve cell content with proper rich text', () => {
      const csvWithFormatting = `Name,Description
John Doe,"Software Engineer with **bold** text"
Jane Smith,"Designer with *italic* text"`;
      
      const result = parseContent(csvWithFormatting, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      
      // Check that cells contain rich text arrays
      tableBlock.table.children.forEach((row: any) => {
        row.table_row.cells.forEach((cell: any) => {
          expect(Array.isArray(cell)).toBe(true);
          if (cell.length > 0) {
            expect(cell[0]).toHaveProperty('type', 'text');
            expect(cell[0]).toHaveProperty('text');
            expect(cell[0]).toHaveProperty('annotations');
          }
        });
      });
    });
  });

  describe('Header Detection Heuristics', () => {
    it('should use multiple heuristics for column header detection', () => {
      const testCases = [
        {
          name: 'Capitalized headers',
          csv: `First Name,Last Name,Email\njohn,doe,john@example.com`,
          expectHeader: true
        },
        {
          name: 'All caps headers',
          csv: `NAME,AGE,CITY\nJohn,30,NYC`,
          expectHeader: true
        },
        {
          name: 'Mixed case descriptive headers',
          csv: `Customer Name,Order Date,Total Amount\nJohn Doe,2023-01-15,99.99`,
          expectHeader: true
        },
        {
          name: 'Numeric data in first row',
          csv: `1,2,3\n4,5,6`,
          expectHeader: false
        },
        {
          name: 'Date data in first row',
          csv: `2023-01-01,2023-01-02,2023-01-03\n100,200,300`,
          expectHeader: false
        }
      ];
      
      testCases.forEach(testCase => {
        const result = parseContent(testCase.csv, { contentType: 'csv' });
        
        expect(result.success).toBe(true);
        const tableBlock = result.blocks[0] as any;
        expect(tableBlock.table.has_column_header).toBe(testCase.expectHeader);
      });
    });

    it('should use statistical analysis for row header detection', () => {
      const testCases = [
        {
          name: 'Text labels in first column',
          csv: `Category,Value1,Value2\nRevenue,1000,1200\nExpenses,800,900`,
          expectRowHeader: true
        },
        {
          name: 'Numeric IDs in first column',
          csv: `ID,Name,Age\n1,John,30\n2,Jane,25`,
          expectRowHeader: false
        },
        {
          name: 'Mixed descriptive labels',
          csv: `Metric,Q1,Q2\nTotal Sales,50000,60000\nNew Customers,100,120`,
          expectRowHeader: true
        }
      ];
      
      testCases.forEach(testCase => {
        const result = parseContent(testCase.csv, { contentType: 'csv' });
        
        expect(result.success).toBe(true);
        const tableBlock = result.blocks[0] as any;
        expect(tableBlock.table.has_row_header).toBe(testCase.expectRowHeader);
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large tables efficiently', () => {
      const largeTableRows = Array(1000).fill(0).map((_, i) => 
        `Row${i},Value${i},Data${i}`
      );
      const largeTable = `Header1,Header2,Header3\n${largeTableRows.join('\n')}`;
      
      const startTime = Date.now();
      const result = parseContent(largeTable, { contentType: 'csv' });
      const processingTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(1000); // Should be reasonably fast
      
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_column_header).toBe(true);
    });

    it('should handle tables with empty cells', () => {
      const tableWithEmpties = `Name,Age,City,Country
John,30,,USA
Jane,,London,UK
,25,Paris,France`;
      
      const result = parseContent(tableWithEmpties, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_column_header).toBe(true);
    });

    it('should handle tables with special characters', () => {
      const specialCharTable = `Nom,Âge,Ville
José,30,São Paulo
François,25,Montréal
Müller,35,München`;
      
      const result = parseContent(specialCharTable, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_column_header).toBe(true);
    });

    it('should handle quoted CSV fields', () => {
      const quotedCsv = `"Product Name","Price (USD)","In Stock"
"MacBook Pro","1999.99","Yes"
"iPhone 14","999.99","No"
"iPad Air","599.99","Yes"`;
      
      const result = parseContent(quotedCsv, { contentType: 'csv' });
      
      expect(result.success).toBe(true);
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.has_column_header).toBe(true);
    });
  });

  describe('Integration with Validation', () => {
    it('should validate table header properties', () => {
      const csvTable = `Name,Age\nJohn,30\nJane,25`;
      const result = parseContent(csvTable, { 
        contentType: 'csv',
        includeValidation: true 
      });
      
      expect(result.success).toBe(true);
      expect(result.validation).toBeDefined();
      expect(result.validation?.isValid).toBe(true);
      
      const tableBlock = result.blocks[0] as any;
      expect(typeof tableBlock.table.has_column_header).toBe('boolean');
      expect(typeof tableBlock.table.has_row_header).toBe('boolean');
    });

    it('should handle validation errors gracefully', () => {
      const malformedTable = `Name,Age,City,Extra,TooMany,Columns,ForNotion
John,30,NYC,1,2,3,4`;
      
      const result = parseContent(malformedTable, { 
        contentType: 'csv',
        includeValidation: true 
      });
      
      expect(result.success).toBe(true);
      // Should handle table width limits
      const tableBlock = result.blocks[0] as any;
      expect(tableBlock.table.table_width).toBeLessThanOrEqual(5);
    });
  });
});