import { Component, OnInit } from "@angular/core";
import { DialogService, DynamicDialogRef } from "primeng/dynamicdialog";
import { forkJoin, Observable, of, catchError, throwError } from "rxjs";
import { switchMap, tap } from "rxjs/operators";
import { globalCacheBusterNotifier } from "ts-cacheable";
import { Org } from "../../core/models/org.model";
import { UserRole } from "../../core/models/user-role.enum";
import { AuthService } from "../../core/services/auth.service";
import { OrgUserService } from "../../core/services/org-user.service";
import { OrgService } from "../../core/services/org.service";
import { RedirectionService } from "../../core/services/redirection.service";
import { TrackingService } from "../../core/services/tracking.service";
import { UserService } from "../../core/services/user.service";
import { SignInQueryParams } from "../sign-in/sign-in-query-params.interface";
import { ExtendedOrgUser } from "../../core/models/extended-org-user.model";
import { UserStorageService } from "../../core/services/user-storage.service";
import { ActivatedRoute, Router } from "@angular/router";
import { IntermediateLoaderComponent } from "../../shared/components/intermediate-loader/intermediate-loader.component";
import { DialogParams } from "../../shared/dialogs/dialog/dialog-params.model";
import { DialogType } from "../../shared/dialogs/dialog/dialog-type.enum";
import { DialogComponent } from "../../shared/dialogs/dialog/dialog.component";
import { TargetAppConfigService } from "../../core/services/target-app-config.service";
import { TargetAppConfig } from "../../core/models/target-app-config.model";
import { RouterAuthService } from "../../core/services/router-auth.service";
import { HttpErrorResponse } from "@angular/common/http";
import { ToastMessageService } from "../../core/services/toast-message.service";
import { ResendEmailVerificationResponse } from "../../core/models/resend-email-verification-response.model";

@Component({
  selector: "app-switch-org",
  templateUrl: "./switch-org.component.html",
  styleUrls: ["./switch-org.component.scss"],
})
export class SwitchOrgComponent implements OnInit {
  orgs: Org[] = [];

  showLoaderDialog: boolean;

  filteredOrgs: Org[] = [];

  searchText: string;

  isLoading: boolean;

  showSearchBar: boolean;

  primaryOrg: Org;

  activeOrg: Org;

  private dialogRef: DynamicDialogRef;

  private queryParams: SignInQueryParams;

  targetConfig: TargetAppConfig;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private orgService: OrgService,
    private userService: UserService,
    private authService: AuthService,
    private redirectionService: RedirectionService,
    private trackingService: TrackingService,
    private userStorageService: UserStorageService,
    private orgUserService: OrgUserService,
    private dialogService: DialogService,
    private targetAppConfigService: TargetAppConfigService,
    private routerAuthService: RouterAuthService,
    private toastMessageService: ToastMessageService
  ) {}

  private markUserActive(roles: UserRole[]): Observable<ExtendedOrgUser> {
    return this.orgUserService.markActive().pipe(
      tap(() => {
        this.handleRedirection(roles);
      })
    );
  }

  private goToSetupPassword(): Observable<null> {
    const params = this.queryParams;
    if (params.redirect_uri) {
      this.redirectionService.handleRedirection(params.redirect_uri);
    } else {
      this.router.navigate(["post_verification/invited_user"], {
        queryParams: { asset: this.queryParams.asset },
      });
    }
    return of(null);
  }

  private handleInviteLinkFlow(
    roles: UserRole[],
    isPasswordSetRequired: boolean
  ): Observable<ExtendedOrgUser | null> {
    if (isPasswordSetRequired) {
      return this.goToSetupPassword();
    } else {
      return this.markUserActive(roles);
    }
  }

  private resendVerification(): Observable<ResendEmailVerificationResponse> {
    const eou = this.authService.getEou();
    const userEmail = eou.us.email;
    const orgId = eou.ou.org_id;

    return this.routerAuthService.resendVerification(userEmail, orgId).pipe(
      tap(() => {
        this.toastMessageService.showSuccessToast("Verification Email Sent");
        /*
         * Case : When user is added to a SSO orgs, but he haven't verified his account through link.
         * After resending invite link, he will be redirected to sign in page since there is no other org he is part of.
         */
        if (this.orgs.length === 1) {
          this.logout();
        }
      }),
      catchError((error: HttpErrorResponse) => {
        this.toastMessageService.showErrorToast(
          "Verification link could not be sent. Please try again!"
        );
        return throwError(() => error);
      })
    );
  }

  private showEmailNotVerifiedAlert(): Observable<ResendEmailVerificationResponse | null> {
    const eou = this.authService.getEou();
    const orgName = eou.ou.org_name;

    const dialogParms: DialogParams = {
      title: "Invite Not Accepted",
      type: DialogType.CONFIRM,
      confirmationMsg: `You have been invited to ${orgName} organization, please check your previous emails and accept the invite or resend invite.`,
      okButtonText: "Resend Invite",
      cancelButtonText: "Cancel",
    };

    this.dialogRef = this.dialogService.open(DialogComponent, {
      data: dialogParms,
      showHeader: false,
      contentStyle: { padding: 0 },
    });

    return this.dialogRef.onClose.pipe(
      switchMap((response: string) => {
        // response === 'hide' refers to, when user clicks on okay button (resend invite).
        if (response === "hide") {
          return this.resendVerification();
        }
        /*
         * Case : When user is added to a SSO orgs, but he haven't verified his account through link.
         * After showing the alert, he will be redirected to sign in page since there is no other org he is part of.
         */
        if (this.orgs.length === 1) {
          this.logout();
        }
        return of(null);
      })
    );
  }

  private handlePendingDetailsUser(
    roles: UserRole[],
    isPasswordSetRequired: boolean,
    autoSwithchedOrg?: boolean
  ): Observable<ExtendedOrgUser | ResendEmailVerificationResponse | null> {
    if (autoSwithchedOrg) {
      return this.handleInviteLinkFlow(roles, isPasswordSetRequired);
    } else {
      return this.showEmailNotVerifiedAlert();
    }
  }

  private handleRedirection(roles: UserRole[]) {
    const params = this.queryParams;
    if (params.redirect_uri) {
      this.redirectionService.handleRedirection(params.redirect_uri);
    } else if (params.fyle_redirect_url) {
      this.redirectionService.handleRedirection(atob(params.fyle_redirect_url));
    } else if (roles.includes(UserRole.OWNER)) {
      this.redirectionService.goToAdminApp();
    } else {
      const primaryRole = this.orgUserService.getPrimaryRole();
      if ([UserRole.APPROVER, UserRole.FYLER].includes(primaryRole)) {
        this.redirectionService.goToMainApp();
      } else {
        this.redirectionService.goToAdminApp();
      }
    }
  }

  private handleActiveUser(roles: UserRole[]) {
    const asset = this.queryParams.asset;
    if (asset === "outlook" || asset === "chrome") {
      this.redirectionService.handleRedirection(
        atob(this.queryParams.fyle_redirect_url)
      );
    } else {
      this.handleRedirection(roles);
    }
  }

  private handleDisabledUser() {
    this.router.navigate(["disabled"]);
  }

  private proceed(
    autoSwithchedOrg?: boolean
  ): Observable<ExtendedOrgUser | ResendEmailVerificationResponse> {
    return this.userService.getUserPasswordStatus().pipe(
      switchMap((passwordStatus) => {
        const pendingDetails = this.userService.isPendingDetails();
        const roles = this.authService.getRoles();
        const isPasswordSetRequired =
          passwordStatus.is_password_required &&
          !passwordStatus.is_password_set;
        if (
          isPasswordSetRequired ||
          (!isPasswordSetRequired && pendingDetails)
        ) {
          return this.handlePendingDetailsUser(
            roles,
            isPasswordSetRequired,
            autoSwithchedOrg
          );
        } else if (this.userService.isActive()) {
          this.handleActiveUser(roles);
        } else if (this.userService.isDisabled()) {
          this.handleDisabledUser();
        }
        return of(null);
      })
    );
  }

  private autoSwitchIfOrgIdPresent() {
    if (this.queryParams.org_id) {
      const selectedOrg = this.orgs.find(
        (org) => org.id === this.queryParams.org_id
      );
      if (selectedOrg) {
        this.switchToOrg(
          selectedOrg,
          "Auto Switched To Org From State Params",
          true
        );
      }
    }
  }

  private filterOrgs(searchValue: string) {
    this.searchText = searchValue;
    searchValue = searchValue.toLocaleLowerCase();
    this.filteredOrgs = this.orgs.filter(
      (org) =>
        org.name.toLowerCase().includes(searchValue) ||
        org.domain.toLowerCase().includes(searchValue) ||
        org.currency.toLowerCase().includes(searchValue)
    );
  }

  switchToOrg(org: Org, source?: string, autoSwithchedOrg?: boolean) {
    if (org.id !== this.primaryOrg.id) {
      const lastLoggedInOrgQueue =
        this.userStorageService.get("last_logged_in_org_queue") || [];

      lastLoggedInOrgQueue.push(org);

      if (lastLoggedInOrgQueue.length > 2) {
        lastLoggedInOrgQueue.shift();
      }

      this.userStorageService.set(
        "last_logged_in_org_queue",
        lastLoggedInOrgQueue
      );
    }

    if (this.showLoaderDialog) {
      this.dialogRef = this.dialogService.open(IntermediateLoaderComponent, {
        showHeader: false,
        styleClass: "intermediate-loader",
      });
      this.switchOrg(org, source, autoSwithchedOrg);
    } else {
      this.switchOrg(org, source, autoSwithchedOrg);
    }
  }

  switchOrg(org: Org, source?: string, autoSwithchedOrg?: boolean) {
    const eou = this.authService.getEou();
    this.orgService
      .switchOrg(org.id)
      .pipe(
        tap((resp) => {
          globalCacheBusterNotifier.next();
          const properties = {
            "Switch To": org.name,
            "Is Destination Org Active": this.activeOrg.id === org.id,
            "Is Destination Org Primary": this.primaryOrg.id === org.id,
            "Is Current Org Primary": this.activeOrg.id === this.primaryOrg.id,
            Source: source,
            "User Email": eou.us.email,
            "User Org Name": eou.ou.org_name,
            "User Org ID": eou.ou.org_id,
            "User Full Name": eou.us.full_name,
          };
          this.trackingService.onSwitchOrg(properties);
          this.dialogRef?.close();
        }),
        switchMap(() => this.proceed(autoSwithchedOrg))
      )
      .subscribe();
  }

  onActiveOrgClick() {
    this.switchToOrg(this.activeOrg, "active org click");
  }

  toggleSearchBar(open: boolean) {
    if (!open) {
      this.searchText = "";
    }
    this.showSearchBar = open;
    this.onInputChange(this.searchText);
  }

  logout() {
    this.router.navigate(["logout"]);
  }

  goBack() {
    this.showLoaderDialog = false;
    this.switchToOrg(this.activeOrg, "Gone Back");
  }

  onInputChange(event: string) {
    this.filterOrgs(event);
  }

  onSearchBoxStateChange(event: "open" | "close") {
    this.showSearchBar = event === "open";
  }

  ngOnInit() {
    this.targetConfig = this.targetAppConfigService.getTargetConfig();
    this.queryParams = this.activatedRoute.snapshot
      .queryParams as SignInQueryParams;
    this.orgs = this.activatedRoute.snapshot.data.orgs as Org[];

    this.isLoading = true;
    this.showLoaderDialog = true;
    this.showSearchBar = false;

    if (this.orgs.length === 1) {
      if (this.queryParams.org_id) {
        this.proceed(true).subscribe();
      } else {
        this.proceed().subscribe();
      }
      return;
    }

    const currentOrg$ = this.orgService.getCurrentOrg();
    const primaryOrg$ = this.orgService.getPrimaryOrg();

    forkJoin({ currentOrg: currentOrg$, primaryOrg: primaryOrg$ }).subscribe(
      (response) => {
        this.isLoading = false;
        if (response.primaryOrg) {
          this.primaryOrg = response.primaryOrg;
          this.orgs = this.orgs.filter((org) => org.id !== this.primaryOrg.id);
          this.orgs.unshift(this.primaryOrg);
        }

        if (response.currentOrg) {
          this.activeOrg = response.currentOrg;
          this.orgs = this.orgs.filter((org) => org.id !== this.activeOrg.id);
          this.orgs.unshift(this.activeOrg);
        }
        this.autoSwitchIfOrgIdPresent();
        this.filteredOrgs = this.orgs;
      }
    );
  }
}
