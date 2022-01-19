use {
    crate::{
        error::MetaplexError,
        state::{
            AuctionManagerStatus, AuctionManagerV2, AuctionWinnerTokenTypeTracker, Key, Store,
            TupleNumericType, MAX_FRACTION_MANAGER_SIZE, PREFIX, TOTALS,
        },
        utils::{
            assert_derivation, assert_initialized, assert_owned_by, create_or_allocate_account_raw,
        },
    },
    borsh::BorshSerialize,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        program_error::ProgramError,
        program_option::COption,
        pubkey::Pubkey,
    },
    metaplex_auction::processor::{AuctionData, AuctionState, ExternalPriceAccountData]},
    spl_token::state::Account,
    metaplex_token_vault::state::{Vault, VaultState},
};

pub fn assert_common_checks(
    program_id: &Pubkey,
    fraction_manager_info: &AccountInfo,
    vault_info: &AccountInfo,
    token_mint_info: &AccountInfo,
    external_price_account_info: &AccountInfo,
    store_info: &AccountInfo,
    accept_payment_info: &AccountInfo,
    authority_info: &AccountInfo,
) -> Result<(u8, Vault, ExternalPriceAccountData), ProgramError> {
    let vault = Vault::from_account_info(vault_info)?;
    let accept_payment: Account = assert_initialized(accept_payment_info)?;
    let external_price_account: Account = assert_initialized(external_price_account_info)?;

    // Assert it is real
    let store = Store::from_account_info(store_info)?;
    assert_owned_by(vault_info, &store.token_vault_program)?;
    assert_owned_by(store_info, program_id)?;

    // TODO - might need to check this and change to something more suitable
    assert_owned_by(accept_payment_info, &store.token_program)?;


    if vault.authority != *fraction_manager_info.key && vault.authority != *authority_info.key{
        return Err(MetaplexError::FractionVaultAuthorityMismatch.into());
    }

    
    if vault.state != VaultState::Active {
        return Err(MetaplexError::VaultMustBeActive.into());
    }

    // Changed to own way of deriving :) replaced auction_info with vault_info
    let bump_seed = assert_derivation(
        program_id,
        fraction_manager_info,
        &[PREFIX.as_bytes(), &vault_info.key.as_ref()],
    )?;

    // TODO - i dont need this because not using auction program. However, if...
    // I use serum and other stuff might need to add some checks for that?
    // CHECKS I MIGHT NEED TO INCLUDE
    // - [ ] SERUM RELATED CHECKS
    // - [ ] External Price Account - check that Serum owns?
    // assert_derivation(
    //     &store.auction_program,
    //     auction_info,
    //     &[
    //         metaplex_auction::PREFIX.as_bytes(),
    //         &store.auction_program.as_ref(),
    //         &vault_info.key.as_ref(),
    //     ],
    // )?;

    if token_mint != accept_payment.mint {
        return Err(MetaplexError::FractionManagerAcceptPaymentMintMismatch.into());
    }

    if token_mint != external_price_account.price_mint {
        return Err(MetaplexError::FractionManagerPriceAccountMintMismatch.into());
    }

    if accept_payment.owner != *fraction_manager_info.key {
        return Err(MetaplexError::FractionAcceptPaymentOwnerMismatch.into());
    }

    if accept_payment.delegate != COption::None {
        return Err(MetaplexError::DelegateShouldBeNone.into());
    }

    if accept_payment.close_authority != COption::None {
        return Err(MetaplexError::CloseAuthorityShouldBeNone.into());
    }

    if vault.state != VaultState::Active {
        return Err(MetaplexError::VaultNotActive.into());
    }

    if vault.token_type_count == 0 {
        return Err(MetaplexError::VaultCannotEmpty.into());
    }

    Ok((bump_seed, vault, external_price_account))
}

pub fn process_init_fraction_manager(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount_type: TupleNumericType,
    length_type: TupleNumericType,
    max_ranges: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    // TODO - Include fraction token tracker back into javascript bit I think and into this... :(
        // Might just be the case of adding tracking for one winner - they only have option of winning all config boxes
    let fraction_manager_info = next_account_info(account_info_iter)?;
    //let fraction_token_tracker_info = next_account_info(account_info_iter)?;
    //let auction_token_tracker_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let token_mint_info = next_account_info(account_info_iter)?;
    let external_price_account_info = next_account_info(account_info_iter)?;
    //let auction_info = next_account_info(account_info_iter)?;
    let authority_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let accept_payment_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let system_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    let (bump_seed, _vault, _external_price_account) = assert_common_checks(
        program_id,
        fraction_manager_info,
        vault_info,
        token_mint_info,
        external_price_account_info,
        store_info,
        accept_payment_info,
        authority_info,
    )?;

    let authority_seeds = &[PREFIX.as_bytes(), &fraction_manager_info.key.as_ref(), &[bump_seed]];

    create_or_allocate_account_raw(
        *program_id,
        fraction_manager_info,
        rent_info,
        system_info,
        payer_info,
        MAX_FRACTION_MANAGER_SIZE,
        authority_seeds,
    )?;

    //let mut auction_manager = AuctionManagerV2::from_account_info(fraction_manager_info)?;
    let mut fraction_manager = FractionManager::from_account_info(fraction_manager_info)?;

    fraction_manager.key = Key::FractionManagerV1;
    fraction_manager.store = *store_info.key;
    fraction_manager.state.status = FractionManagerStatus::Initialized;
    fraction_manager.vault = *vault_info.key;
    fraction_manager.authority = *authority_info.key;
    fraction_manager.accept_payment = *accept_payment_info.key;
    //fraction_manager.state.safety_config_items_validated = 0;
    //fraction_manager.state.bids_pushed_to_accept_payment = 0;

    fraction_manager.token_mint = *token_mint.key;

    fraction_manager.serialize(&mut *fraction_manager_info.data.borrow_mut())?;

    Ok(())
}
