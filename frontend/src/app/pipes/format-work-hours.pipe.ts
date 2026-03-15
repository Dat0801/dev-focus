import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatWorkHours',
  standalone: true
})
export class FormatWorkHoursPipe implements PipeTransform {

  transform(hoursDecimal: number | null | undefined): string {
    if (hoursDecimal === null || hoursDecimal === undefined || hoursDecimal <= 0) {
      return '0p';
    }

    if (hoursDecimal < 1) {
      const minutes = Math.round(hoursDecimal * 60);
      return `${minutes}p`;
    }

    const hours = Math.floor(hoursDecimal);
    const remainingMinutes = Math.round((hoursDecimal - hours) * 60);

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h${remainingMinutes}p`;
  }

}
