import { ComponentFixture, TestBed, waitForAsync } from "@angular/core/testing";
import { IonicModule } from "@ionic/angular";
import { AuthService } from "../../core/services/auth.service";
import { OrgUserService } from "../../core/services/org-user.service";
import { OrgService } from "../../core/services/org.service";
import { RedirectionService } from "../../core/services/redirection.service";
import { TrackingService } from "../../core/services/tracking.service";
import { UserService } from "../../core/services/user.service";
import { UserStorageService } from "../../core/services/user-storage.service";
import { TargetAppConfigService } from "../../core/services/target-app-config.service";
import { RouterAuthService } from "../../core/services/router-auth.service";
import { ToastMessageService } from "../../core/services/toast-message.service";
import { SwitchOrgComponent } from "./test";
import { DialogService } from "primeng/dynamicdialog";
import { ActivatedRoute, Router } from "@angular/router";
xdescribe("SwitchOrgComponent", () => {
  let component: SwitchOrgComponent;
  let fixture: ComponentFixture<SwitchOrgComponent>;
  let router: jasmine.SpyObj<Router>;
  let activatedRoute: jasmine.SpyObj<ActivatedRoute>;
  let orgService: jasmine.SpyObj<OrgService>;
  let userService: jasmine.SpyObj<UserService>;
  let authService: jasmine.SpyObj<AuthService>;
  let redirectionService: jasmine.SpyObj<RedirectionService>;
  let trackingService: jasmine.SpyObj<TrackingService>;
  let userStorageService: jasmine.SpyObj<UserStorageService>;
  let orgUserService: jasmine.SpyObj<OrgUserService>;
  let dialogService: jasmine.SpyObj<DialogService>;
  let targetAppConfigService: jasmine.SpyObj<TargetAppConfigService>;
  let routerAuthService: jasmine.SpyObj<RouterAuthService>;
  let toastMessageService: jasmine.SpyObj<ToastMessageService>;
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [SwitchOrgComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(SwitchOrgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));
  it("should create", () => {
    expect(component).toBeTruthy();
  });
  xit("markUserActive", () => {});
  xit("goToSetupPassword", () => {});
  xit("handleInviteLinkFlow", () => {});
  xit("resendVerification", () => {});
  xit("showEmailNotVerifiedAlert", () => {});
  xit("handleRedirection", () => {});
  xit("handleActiveUser", () => {});
  xit("handleDisabledUser", () => {});
  xit("proceed", () => {});
  xit("autoSwitchIfOrgIdPresent", () => {});
  xit("filterOrgs", () => {});
  xit("switchToOrg", () => {});
  xit("switchOrg", () => {});
  xit("onActiveOrgClick", () => {});
  xit("toggleSearchBar", () => {});
  xit("logout", () => {});
  xit("goBack", () => {});
});
