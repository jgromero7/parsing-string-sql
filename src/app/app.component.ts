import { Component } from '@angular/core';

import { MatSnackBar } from '@angular/material';

import { ParsingStringService } from './services/parsing-string.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  
  public inputValue = 'SELECT field, field1, field2, field3 FROM table_name WHERE id = 5';
  public resultF;
  
  constructor(
    private _parsingStringS: ParsingStringService,
    private snackBar: MatSnackBar
  ) {
    
  }
  
  onSubmit() {

    const result = this._parsingStringS.parsingSQL(this.inputValue);

    // SELECT attrib, field FROM tables WHERE id > 1
    if (result.lexErrors.length > 0) {
      // this.(result.lexErrors, 'Error');
    }

    if (result.parseErrors.length > 0) {
      this.openSnackBar(result.parseErrors[0].message, 'Error');
    }
    this.resultF = result.result;

  }

  openSnackBar(message: string, action: string) {
    this.snackBar.open(message, action, {
      duration: 2000,
    });
  }
  
}
