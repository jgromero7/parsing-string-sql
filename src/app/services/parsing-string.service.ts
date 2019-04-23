import { Injectable } from '@angular/core';

// import { map } from 'rxjs/operators';

import {
    createToken,
    Lexer,
    Parser,
    IToken,
    ILexingError,
    IRecognitionException
} from 'chevrotain';

const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z]\w*/ });

const Select = createToken({
    name: 'Select',
    pattern: /SELECT/,
    longer_alt: Identifier
});

const From = createToken({
    name: 'From',
    pattern: /FROM/,
    longer_alt: Identifier
});

const Where = createToken({
    name: 'Where',
    pattern: /WHERE/,
    longer_alt: Identifier
});

const GroupBy = createToken({
    name: 'GroupBy',
    pattern: /GROUP BY/,
    longer_alt: Identifier
});

const Comma = createToken({ name: 'Comma', pattern: /,/ });
const Integer = createToken({ name: 'Integer', pattern: /0|[1-9]\d*/ });
const Equal = createToken({ name: 'Equal', pattern: /=/ });
const GreaterThan = createToken({ name: 'GreaterThan', pattern: />/ });
const LessThan = createToken({ name: 'LessThan', pattern: /</ });

const WhiteSpace = createToken({
    name: 'WhiteSpace',
    pattern: /\s+/,
    group: Lexer.SKIPPED
});

const ALL_TOKENS = [
    WhiteSpace,
    // "keywords" appear before the Identifier
    Select,
    From,
    Where,
    GroupBy,
    Comma,
    // The Identifier must appear after the keywords because all keywords are valid identifiers.
    Identifier,
    Integer,
    Equal,
    GreaterThan,
    LessThan
];

const SQLLexer = new Lexer(ALL_TOKENS);

@Injectable({
  providedIn: 'root'
})
export class ParsingStringSQL extends Parser {

  constructor(

  ) {
    super(ALL_TOKENS);
  }
  
  public selectStatement = this.RULE('selectStatement', () => {
    // using ES6 Arrow functions to reduce verbosity.
    this.SUBRULE(this.selectClause),
    this.SUBRULE(this.fromClause),
    this.OPTION(() => {
                     this.SUBRULE(this.whereClause);
    });
  });

  private selectClause = this.RULE('selectClause', () => {
    this.CONSUME(Select);
    this.AT_LEAST_ONE_SEP({
        SEP: Comma,
        DEF: () => {
            this.CONSUME(Identifier);
        }
    });
  });

  private fromClause = this.RULE('fromClause', () => {
      this.CONSUME(From);
      this.CONSUME(Identifier);
  });

  private whereClause = this.RULE('whereClause', () => {
      this.CONSUME(Where);
      this.SUBRULE(this.expression);
  });

  private goupByClause = this.RULE('goupByClause', () => {
      this.CONSUME(GroupBy);
      this.SUBRULE(this.expression);
  });

  private expression = this.RULE('expression', () => {
      this.SUBRULE(this.atomicExpression, { LABEL: 'lhs' });
      this.SUBRULE(this.relationalOperator);
      this.SUBRULE2(this.atomicExpression, { LABEL: 'rhs' }); // note the '2' suffix to distinguish
      // from the 'SUBRULE(atomicExpression)'
      // 2 lines above.
  });

  private atomicExpression = this.RULE('atomicExpression', () => {
      this.OR([
          { ALT: () => this.CONSUME(Integer) },
          { ALT: () => this.CONSUME(Identifier) }
      ]);
  });

  private relationalOperator = this.RULE('relationalOperator', () => {
      this.OR([
          { ALT: () => this.CONSUME(Equal) },
          { ALT: () => this.CONSUME(LessThan) },
          { ALT: () => this.CONSUME(GreaterThan) }
      ]);
  });
  
}

const parser = new ParsingStringSQL();

export class ParsingStringService {

  parsingSQL(SQL: any) {
    const lexResult = SQLLexer.tokenize(SQL);

    parser.input = lexResult.tokens;

    const cst = parser.selectStatement();

    let result = null;

    if (cst) {
      result = this.selectStatement(cst.children);
    }

    return {
        result: result,
        lexErrors: lexResult.errors,
        parseErrors: parser.errors
    };
  }

  selectStatement(ctx) {
        // "this.visit" can be used to visit none-terminals and will invoke the correct visit method for the CstNode passed.
        const select = this.selectClause(ctx.selectClause);

        //  "this.visit" can work on either a CstNode or an Array of CstNodes.
        //  If an array is passed (ctx.fromClause is an array) it is equivalent
        //  to passing the first element of that array
        let from = null;
        if (ctx.hasOwnProperty('fromClause')) {
           from = this.fromClause(ctx.fromClause);
        }

        // "whereClause" is optional, "this.visit" will ignore empty arrays (optional)
        let where = null;
        if (ctx.hasOwnProperty('whereClause')) {
          where = this.whereClause(ctx.whereClause);
        }

        return {
            type: 'SELECT_STMT',
            selectClause: select,
            fromClause: from,
            whereClause: where
        };
    }

    selectClause(ctx) {
        // const columns = ctx.Identifier.map(identToken => identToken.image)
        const columns = ctx[0].children.Identifier;
        const field = [];

        for (const i in columns) {
            if (columns.hasOwnProperty(i)) {
                field.push(columns[i].image);
            }
        }

        return {
            type: 'SELECT',
            columns: field
        };
    }

    fromClause(ctx) {
        const tableName = ctx[0].children.Identifier[0].image;

        return {
            type: 'FROM',
            table: tableName
        };
    }

    whereClause(ctx) {
        const condition = ctx[0].children.expression[0].children;

        const conditions = this.expression(condition);

        return {
            type: 'WHERE',
            condition: conditions
        };
    }

    expression(ctx) {
        // Note the usage of the "rhs" and "lhs" labels defined in step 2 in the expression rule.
        const lhs = ctx.lhs[0].children.Identifier[0].image;
        const operator = this.relationalOperator(ctx.relationalOperator[0].children);
        const rhs = this.atomicExpression(ctx.rhs[0].children);

        return {
            type: 'EXPRESSION',
            lhs: lhs,
            operator: operator,
            rhs: rhs
        };
    }

    // these two visitor methods will return a string.
    atomicExpression(ctx) {
        if (ctx.Integer) {
            return ctx.Integer[0].image;
        } else {
            return ctx.Identifier[0].image;
        }
    }

    relationalOperator(ctx) {
        if (ctx.Equal) {
            return ctx.Equal[0].image;
        } else if (ctx.GreaterThan) {
            return ctx.GreaterThan[0].image;
        } else {
            return ctx.LessThan[0].image;
        }
    }

}
