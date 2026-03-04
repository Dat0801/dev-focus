import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  constructor(private navCtrl: NavController) {}

  onTabClick(tab: string) {
    if (tab === 'projects') {
      this.navCtrl.navigateRoot('/tabs/projects');
    }
  }
}
